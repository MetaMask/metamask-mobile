import React, { useMemo } from 'react';
import { ImageBackground, Pressable, useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
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
  Icon,
  IconColor,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  getCampaignStatusInfo,
  isCampaignTypeSupported,
} from './CampaignTile.utils';
import { selectCampaignParticipantCount } from '../../../../../reducers/rewards/selectors';
import { strings } from '../../../../../../locales/i18n';
import useGetCampaignParticipantStatus from '../../hooks/useGetCampaignParticipantStatus';

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
  const navigation = useNavigation();

  const participantCount = useSelector(
    selectCampaignParticipantCount(campaign.id),
  );

  const {
    status: campaignStatus,
    statusLabel,
    /* dateLabel,
    dateLabelIcon, */
  } = useMemo(() => getCampaignStatusInfo(campaign), [campaign]);

  const { status: participantStatus } = useGetCampaignParticipantStatus(
    campaignStatus === 'active' && campaign.type === CampaignType.ONDO_HOLDING
      ? campaign.id
      : undefined,
  );

  const isInteractive =
    campaignStatus !== 'upcoming' &&
    (onPress != null || isCampaignTypeSupported(campaign.type));

  const backgroundImageUrl =
    colorScheme === 'dark'
      ? campaign.image?.darkModeUrl
      : campaign.image?.lightModeUrl;

  const handlePress = () => {
    if (!isInteractive) return;

    if (onPress) {
      onPress();
    } else if (campaign.type === CampaignType.ONDO_HOLDING) {
      navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW, {
        campaignId: campaign.id,
      });
    } else if (campaign.type === CampaignType.SEASON_1) {
      navigation.navigate(Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW, {
        campaignId: campaign.id,
      });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      style={({ pressed }) =>
        tw.style(
          'rounded-xl overflow-hidden h-50 bg-muted',
          pressed && isInteractive && 'opacity-70',
        )
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
          justifyContent={BoxJustifyContent.Between}
          twClassName="p-4 flex-1"
        >
          {/* Date label */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
            testID="campaign-tile-date-label"
          >
            {/* removed content for now; will be moved to bottom half of card instead */}
          </Box>
          <Box>
            <Box>
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
                {participantCount != null ? (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-1"
                    testID="campaign-tile-participant-count"
                  >
                    <Icon
                      name={IconName.TrendUp}
                      size={IconSize.Sm}
                      color={IconColor.OverlayInverse}
                    />
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.OverlayInverse}
                      fontWeight={FontWeight.Medium}
                    >
                      {strings('rewards.campaign.participant_count', {
                        count: participantCount.toLocaleString(),
                      })}
                    </Text>
                  </Box>
                ) : campaignStatus === 'active' &&
                  participantStatus?.optedIn !== true ? (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-1"
                    testID="campaign-tile-enter-now"
                  >
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
                    >
                      {strings('rewards.campaign.enter_now')}
                    </Text>
                  </Box>
                ) : (
                  <></>
                )}
              </Box>
            </Box>

            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.OverlayInverse}
              twClassName="font-bold"
              testID="campaign-tile-name"
            >
              {campaign.name}
            </Text>
          </Box>
        </Box>
      </ImageBackground>
    </Pressable>
  );
};

export default CampaignTile;
