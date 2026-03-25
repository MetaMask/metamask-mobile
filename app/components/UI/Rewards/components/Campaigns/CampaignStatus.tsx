import React, { useMemo } from 'react';
import { ImageBackground, useColorScheme } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatusInfo } from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';

export const CAMPAIGN_STATUS_TEST_IDS = {
  CONTAINER: 'campaign-status-container',
  IMAGE: 'campaign-status-image',
  STATUS_LABEL: 'campaign-status-label',
  DATE_LABEL: 'campaign-status-date-label',
  HOW_IT_WORKS_TITLE: 'campaign-status-how-it-works-title',
  HOW_IT_WORKS_DESCRIPTION: 'campaign-status-how-it-works-description',
} as const;

interface CampaignStatusProps {
  campaign: CampaignDto;
  optedIn?: boolean;
}

const CampaignStatus: React.FC<CampaignStatusProps> = ({
  campaign,
  optedIn = false,
}) => {
  const tw = useTailwind();
  const colorScheme = useColorScheme();

  const { statusLabel, dateLabel } = useMemo(
    () => getCampaignStatusInfo(campaign),
    [campaign],
  );

  const backgroundImageUrl =
    colorScheme === 'dark'
      ? campaign.image?.darkModeUrl
      : campaign.image?.lightModeUrl;

  const howItWorksTitle = campaign.details?.howItWorks?.title;
  const howItWorksDescription = campaign.details?.howItWorks?.description;

  return (
    <Box twClassName="gap-4 p-4" testID={CAMPAIGN_STATUS_TEST_IDS.CONTAINER}>
      <Box twClassName="rounded-xl overflow-hidden h-50 bg-muted">
        <ImageBackground
          source={{ uri: backgroundImageUrl }}
          resizeMode="cover"
          style={tw.style('flex-1')}
          testID={CAMPAIGN_STATUS_TEST_IDS.IMAGE}
        />
      </Box>

      <Box twClassName="gap-2">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
            testID={CAMPAIGN_STATUS_TEST_IDS.STATUS_LABEL}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {statusLabel}
            </Text>
            {optedIn && (
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                ({strings('rewards.campaign.entered')})
              </Text>
            )}
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
            testID={CAMPAIGN_STATUS_TEST_IDS.DATE_LABEL}
          >
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              •
            </Text>
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {dateLabel}
            </Text>
          </Box>
        </Box>

        {howItWorksTitle ? (
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            testID={CAMPAIGN_STATUS_TEST_IDS.HOW_IT_WORKS_TITLE}
          >
            {howItWorksTitle}
          </Text>
        ) : null}

        {howItWorksDescription ? (
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-alternative"
            testID={CAMPAIGN_STATUS_TEST_IDS.HOW_IT_WORKS_DESCRIPTION}
          >
            {howItWorksDescription}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};

export default CampaignStatus;
