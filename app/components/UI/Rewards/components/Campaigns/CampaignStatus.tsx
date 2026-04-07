import React, { useMemo } from 'react';
import { ImageBackground, useColorScheme } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CampaignDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatusInfo } from './CampaignTile.utils';
import { formatUTCDate } from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';

export const CAMPAIGN_STATUS_TEST_IDS = {
  CONTAINER: 'campaign-status-container',
  IMAGE: 'campaign-status-image',
  STATUS_LABEL: 'campaign-status-label',
  DATE_LABEL: 'campaign-status-date-label',
  HOW_IT_WORKS_TITLE: 'campaign-status-how-it-works-title',
  DEPOSIT_WINDOW: 'campaign-status-deposit-window',
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
  const depositWindowLabel = useMemo(() => {
    const rawDate = campaign.details?.depositCutoffDate;
    if (!rawDate) return null;
    const cutoff = new Date(rawDate);
    const formatted = formatUTCDate(rawDate.split('T')[0], undefined, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: undefined,
    });
    return cutoff < new Date()
      ? strings('rewards.campaign_status.deposit_closed_on', {
          date: formatted,
        })
      : strings('rewards.campaign_status.deposit_closes', { date: formatted });
  }, [campaign.details?.depositCutoffDate]);

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
          twClassName="gap-2"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1 bg-success-muted rounded px-1.5"
            testID={CAMPAIGN_STATUS_TEST_IDS.STATUS_LABEL}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {statusLabel}
            </Text>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
            testID={CAMPAIGN_STATUS_TEST_IDS.DATE_LABEL}
          >
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
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

        {depositWindowLabel ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="rounded-xl bg-muted px-3 py-2"
            testID={CAMPAIGN_STATUS_TEST_IDS.DEPOSIT_WINDOW}
          >
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {strings('rewards.campaign_status.deposit_window')}
            </Text>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {depositWindowLabel}
            </Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default CampaignStatus;
