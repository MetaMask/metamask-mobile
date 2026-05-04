import React, { useMemo } from 'react';
import { ImageBackground, Pressable, useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { useCampaignReminderActions } from '../../hooks/useCampaignReminderActions';

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
 * - Unsupported types: non-interactive unless onPress is provided
 * - With onPress: executes custom handler regardless of type
 */
const CampaignTile: React.FC<CampaignTileProps> = ({ campaign, onPress }) => {
  const tw = useTailwind();
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const {
    status: campaignStatus,
    statusLabel,
    dateLabel,
  } = useMemo(() => getCampaignStatusInfo(campaign), [campaign]);

  const { status: participantStatus, isLoading: isParticipantStatusLoading } =
    useGetCampaignParticipantStatus(
      campaignStatus === 'active' && campaign.type === CampaignType.ONDO_HOLDING
        ? campaign.id
        : undefined,
    );

  const isInteractive =
    campaignStatus !== 'upcoming' &&
    (onPress != null || isCampaignTypeSupported(campaign.type));

  const reminderFeatureEnabled =
    campaignStatus === 'upcoming' && isCampaignTypeSupported(campaign.type);

  const { showRemindMeCta, handleRemindMePress } = useCampaignReminderActions(
    campaign,
    reminderFeatureEnabled,
  );

  const shouldShowDateLabel =
    campaignStatus !== 'upcoming' || campaign.showUpcomingDate;

  const backgroundImageUrl =
    colorScheme === 'dark'
      ? campaign.image?.darkModeUrl
      : campaign.image?.lightModeUrl;

  const hasTour = (campaign.details?.howItWorks?.tour?.length ?? 0) > 0;
  const shouldShowTour =
    hasTour &&
    !isParticipantStatusLoading &&
    participantStatus?.optedIn !== true &&
    campaignStatus === 'active';

  const handlePress = () => {
    if (!isInteractive) return;

    if (onPress) {
      onPress();
    } else if (campaign.type === CampaignType.ONDO_HOLDING) {
      if (shouldShowTour) {
        navigation.navigate(Routes.REWARDS_CAMPAIGN_TOUR_STEP, {
          campaignId: campaign.id,
        });
      } else {
        navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW, {
          campaignId: campaign.id,
        });
      }
    } else if (campaign.type === CampaignType.SEASON_1) {
      navigation.navigate(Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW, {
        campaignId: campaign.id,
      });
    }
  };

  return (
    <Box twClassName="h-50 rounded-xl overflow-hidden bg-muted">
      <Pressable
        onPress={handlePress}
        disabled={!isInteractive}
        style={({ pressed }) =>
          tw.style('absolute inset-0', pressed && isInteractive && 'opacity-70')
        }
        testID={`campaign-tile-${campaign.id}`}
      >
        <ImageBackground
          source={{ uri: backgroundImageUrl }}
          resizeMode="cover"
          style={tw.style('flex-1')}
          testID="campaign-tile-background"
        >
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
                    colorScheme === 'dark'
                      ? TextColor.SuccessDefault
                      : TextColor.OverlayInverse
                  }
                  fontWeight={FontWeight.Medium}
                >
                  {statusLabel}
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

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Box twClassName="min-w-0 flex-1 shrink">
                <Text
                  variant={TextVariant.HeadingLg}
                  color={TextColor.OverlayInverse}
                  twClassName="font-bold"
                  testID="campaign-tile-name"
                >
                  {campaign.name}
                </Text>
              </Box>
              {showRemindMeCta && (
                <Pressable
                  onPress={() => {
                    handleRemindMePress().catch(() => undefined);
                  }}
                  testID={`campaign-tile-remind-me-${campaign.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={strings('rewards.campaign.notify_me')}
                  hitSlop={12}
                  style={({ pressed }) => tw.style(pressed && 'opacity-70')}
                >
                  <NotificationIcon
                    name="notification"
                    width={24}
                    height={24}
                    color={colors.overlay.inverse}
                  />
                </Pressable>
              )}
            </Box>
          </Box>
        </ImageBackground>
      </Pressable>
    </Box>
  );
};

export default CampaignTile;
