import React, { useMemo, useCallback } from 'react';
import { ImageBackground, Pressable, useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import Routes from '../../../../../constants/navigation/Routes';
import { getCampaignStatusInfo } from './CampaignTile.utils';
import { selectCampaignParticipantCount } from '../../../../../reducers/rewards/selectors';
import { strings } from '../../../../../../locales/i18n';

interface CampaignTileProps {
  campaign: CampaignDto;
}

/**
 * CampaignTile displays campaign information with status.
 * Tapping navigates to the campaign details screen.
 */
const CampaignTile: React.FC<CampaignTileProps> = ({ campaign }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const participantCount = useSelector(
    selectCampaignParticipantCount(campaign.id),
  );

  const { status, statusLabel, dateLabel, dateLabelIcon } = useMemo(
    () => getCampaignStatusInfo(campaign),
    [campaign],
  );

  const backgroundImageUrl =
    colorScheme === 'dark'
      ? campaign.details?.image?.darkModeUrl
      : campaign.details?.image?.lightModeUrl;

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.CAMPAIGN_DETAILS, { campaign });
  }, [navigation, campaign]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) =>
        tw.style(
          'rounded-xl overflow-hidden h-50 bg-muted',
          pressed && 'opacity-70',
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
            <Icon
              name={dateLabelIcon}
              size={IconSize.Sm}
              color={IconColor.OverlayInverse}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.OverlayInverse}
              fontWeight={FontWeight.Medium}
            >
              {dateLabel}
            </Text>
          </Box>
          <Box>
            <Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-1"
                testID="campaign-tile-status-label"
              >
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
                ) : status === 'active' ? (
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
